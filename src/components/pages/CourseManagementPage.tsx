'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { logCourseCreation, logActivity } from '@/lib/activityLogger'
import { useToast } from '@/contexts/ToastContext'
import { Loading, ButtonLoading } from '@/components/ui/loading'

interface Course {
  id: string
  title: string
  description: string
  course_group?: string
  course_type: 'academic' | 'tesda' | 'upskill'
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  created_at: string
  subjects?: Subject[]
}

interface Subject {
  id: string
  course_id: string
  title: string
  description: string
  peer_lead_id?: string
  trainee_name?: string
  trainee?: {
    first_name: string
    last_name: string
  }
  order_index: number
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  created_at: string
  modules?: CourseModule[]
  enrollment_count?: number
}

interface CourseModule {
  id: string
  subject_id: string
  title: string
  description: string
  content_type: 'video' | 'text' | 'online_conference' | 'online_document' | 'pdf_document' | 'canva_presentation'
  order_index: number
  status?: 'active' | 'inactive' | 'draft'
  duration_minutes?: number
  canva_url?: string
  conference_url?: string
  text_content?: string
  video_url?: string
  document_url?: string
  created_at: string
}

interface NewCourse {
  title: string
  description: string
  course_group: string
  course_type: 'academic' | 'tesda' | 'upskill'
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  color_name?: string
  color_hex?: string
  bg_class?: string
  text_class?: string
  border_class?: string
}

interface NewSubject {
  title: string
  description: string
  peer_lead_id?: string
  order_index: number
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
}

interface NewCourseModule {
  title: string
  description: string
  content_type: 'video' | 'text' | 'online_conference' | 'online_document' | 'pdf_document' | 'canva_presentation'
  status: 'active' | 'inactive' | 'draft'
  duration_minutes?: number
  canva_url?: string
  conference_url?: string
  text_content?: string
  video_url?: string
  document_url?: string
}

export default function CourseManagementPage() {
  const { user } = useAuth()
  
  // Permission check: Only admins and developers can access this page
  const userRole = user?.profile?.role
  const hasPermission = userRole === 'admin' || userRole === 'developer'
  
  const [currentView, setCurrentView] = useState<'courses' | 'subjects' | 'modules'>('courses')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  
  // Data states
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [modules, setModules] = useState<CourseModule[]>([])
  
  // Early return if user doesn't have permission
  if (!hasPermission) {
    return (
      <div className="p-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
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
  const [trainees, settrainees] = useState<Array<{id: string, first_name: string, last_name: string, email: string}>>([])
  const [instructors, setInstructors] = useState<Array<{id: string, first_name: string, last_name: string, email: string}>>([])
  const [enrolledtrainees, setEnrolledtrainees] = useState<Array<{id: string, first_name: string, last_name: string, email: string, enrollment_id: string, enrolled_at: string, status: string, progress: number}>>([])
  const [availabletrainees, setAvailabletrainees] = useState<Array<{id: string, first_name: string, last_name: string, email: string}>>([])
  const [selectedtrainees, setSelectedtrainees] = useState<string[]>([])
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<Course | null>(null)
  const [availableColors, setAvailableColors] = useState<Array<{id: string, color_name: string, color_hex: string, bg_class: string, text_class: string, border_class: string}>>([])
  const [courseColors, setCourseColors] = useState<Array<{course_id: string, color_name: string, color_hex: string}>>([])
  
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
  
  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  
  // Form states
  const [newCourse, setNewCourse] = useState<NewCourse>({
    title: '',
    description: '',
    course_group: '',
    course_type: 'academic',
    status: 'draft',
    enrollment_type: 'trainee',
    color_name: '',
    color_hex: '',
    bg_class: '',
    text_class: '',
    border_class: ''
  })
  
  const [newSubject, setNewSubject] = useState<NewSubject>({
    title: '',
    description: '',
    peer_lead_id: '',
    order_index: 1,
    status: 'draft',
    enrollment_type: 'trainee'
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
    document_url: ''
  })
  
  // Editing states
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null)
  const [deletingItem, setDeletingItem] = useState<{type: 'course' | 'subject' | 'module', item: Course | Subject | CourseModule} | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  
  const supabase = createClient()
  const { showSuccess, showError } = useToast()

  // Function to upload PDF file to Supabase Storage
  const uploadPDFFile = async (file: File): Promise<string | null> => {
    try {
      setUploadingFile(true)
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `module-documents/${fileName}`

      // Upload file to Supabase Storage with proper content type
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
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

  // Helper function to get button background color
  const getButtonBg = () => '#3b82f6'
  
  // Helper function to get button hover color (slightly darker)
  const getButtonHoverBg = () => '#2563eb'

  // Fetch data functions
  const fetchCourses = async () => {
    try {
      setLoading(true)
      
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching courses:', error)
        return
      }

      setCourses(coursesData || [])
      console.log('Courses loaded:', coursesData?.length || 0, coursesData)

      // Fetch course colors
      const { data: colorsData, error: colorsError } = await supabase
        .from('course_colors')
        .select('*')

      if (colorsError) {
        console.error('Error fetching course colors:', colorsError)
      } else {
        setCourseColors(colorsData || [])
      }

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
    } catch (error) {
      console.error('Error fetching modules:', error)
    }
  }

  const fetchtrainees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('role', ['trainee', 'tesda_scholar'])
        .order('first_name', { ascending: true })

      if (error) {
        // Silently handle RLS policy restrictions - set empty array to prevent UI issues
        settrainees([])
        return
      }

      settrainees(data || [])
    } catch (error) {
      // Silently handle errors - set empty array to prevent UI issues
      settrainees([])
    }
  }

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'instructor')
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

  const fetchAvailableColors = async () => {
    try {
      const { data, error } = await supabase
        .from('available_colors')
        .select('*')
        .eq('is_used', false)
        .order('color_name', { ascending: true })

      if (error) {
        console.error('Error fetching available colors:', error)
        return
      }

      setAvailableColors(data || [])
    } catch (error) {
      console.error('Error fetching available colors:', error)
    }
  }

  const fetchEnrollments = async (courseId: string) => {
      try {
        const { data, error } = await supabase
          .from('course_enrollments')
          .select(`
            *,
            trainee:profiles(id, first_name, last_name, email)
          `)
          .eq('course_id', courseId)
          .order('enrolled_at', { ascending: false })

        if (error) {
          console.error('Error fetching enrollments:', error)
          return
        }

        interface EnrollmentData {
          id: string
          enrolled_at: string
          status: string
          progress: number
          trainee: {
            id: string
            first_name: string
            last_name: string
            email: string
          }
        }

        type Enrolledtrainee = {
          id: string
          first_name: string
          last_name: string
          email: string
          enrollment_id: string
          enrolled_at: string
          status: string
          progress: number
        }

        const enrolled: Enrolledtrainee[] = (data || []).map((enrollment: EnrollmentData) => ({
          ...enrollment.trainee,
          enrollment_id: enrollment.id,
          enrolled_at: enrollment.enrolled_at,
          status: enrollment.status,
          progress: enrollment.progress
        }))

        setEnrolledtrainees(enrolled)

        // Filter available trainees (not enrolled)
        const enrolledtraineeIds = enrolled.map((s: Enrolledtrainee) => s.id)
        const available = trainees.filter(trainee => !enrolledtraineeIds.includes(trainee.id))
        setAvailabletrainees(available)

      } catch (error) {
        console.error('Error fetching enrollments:', error)
      }
    }

  useEffect(() => {
    console.log('CourseManagementPage mounted, fetching data...')
    fetchCourses()
    fetchtrainees()
    fetchInstructors()
    fetchAvailableColors()
  }, [])

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
    fetchSubjects(course.id)
  }

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject)
    setCurrentView('modules')
    fetchModules(subject.id)
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
          description: newCourse.course_group, // Store course group in description field for now
          course_group: newCourse.course_group,
          course_type: newCourse.course_type,
          status: newCourse.status,
          enrollment_type: newCourse.enrollment_type
        }])
        .select()
        .single()

      if (courseError) {
        console.error('Error creating course:', courseError)
        showError('Error', 'Error creating course: ' + courseError.message)
        return
      }

      // If a color was selected, assign it to the course
      if (newCourse.color_name && courseData) {
        const { error: colorError } = await supabase
          .from('course_colors')
          .insert([{
            course_id: courseData.id,
            color_name: newCourse.color_name,
            color_hex: newCourse.color_hex,
            bg_class: newCourse.bg_class,
            text_class: newCourse.text_class,
            border_class: newCourse.border_class
          }])

        if (colorError) {
          console.error('Error assigning course color:', colorError)
          // Don't fail the course creation if color assignment fails
        } else {
          // Mark the color as used
          const selectedColor = availableColors.find(c => c.color_name === newCourse.color_name)
          if (selectedColor) {
            await supabase
              .from('available_colors')
              .update({ is_used: true })
              .eq('id', selectedColor.id)
          }
        }
      }

      setNewCourse({
        title: '',
        description: '',
        course_group: '',
        course_type: 'academic',
        status: 'draft',
        enrollment_type: 'trainee',
        color_name: '',
        color_hex: '',
        bg_class: '',
        text_class: '',
        border_class: ''
      })
      setShowAddCourseModal(false)
      await fetchCourses()
      await fetchAvailableColors() // Refresh available colors
      
      // Log the course creation activity
      if (user?.id && courseData) {
        await logCourseCreation(
          user.id,
          courseData.id,
          courseData.title,
          {
            status: courseData.status,
            enrollment_type: courseData.enrollment_type,
            color_assigned: !!newCourse.color_name
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
          description: newSubject.description,
          peer_lead_id: newSubject.peer_lead_id || null,
          status: newSubject.status,
          enrollment_type: newSubject.enrollment_type,
          order_index: targetOrderIndex
        }])

      if (error) {
        console.error('Error creating subject:', error)
        showError('Error', 'Error creating subject: ' + error.message)
        return
      }

      setNewSubject({
        title: '',
        description: '',
        peer_lead_id: '',
        order_index: 1,
        status: 'draft',
        enrollment_type: 'trainee'
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
        description: newModule.description,
        content_type: newModule.content_type,
        status: newModule.status,
        order_index: nextOrderIndex,
        duration_minutes: newModule.duration_minutes || null,
        canva_url: newModule.canva_url || null,
        conference_url: newModule.conference_url || null,
        text_content: newModule.text_content || null,
        video_url: newModule.video_url || null,
        document_url: newModule.document_url || null
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
        document_url: ''
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
    setNewModule({
      title: module.title,
      description: module.description,
      content_type: module.content_type,
      status: module.status || 'draft',
      duration_minutes: module.duration_minutes || 0,
      canva_url: module.canva_url || '',
      conference_url: module.conference_url || '',
      text_content: module.text_content || '',
      video_url: module.video_url || '',
      document_url: module.document_url || ''
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
        description: newModule.description,
        content_type: newModule.content_type,
        status: newModule.status,
        duration_minutes: newModule.duration_minutes || null,
        canva_url: newModule.canva_url || null,
        conference_url: newModule.conference_url || null,
        text_content: newModule.text_content || null,
        video_url: newModule.video_url || null,
        document_url: newModule.document_url || null
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

      setNewModule({
        title: '',
        description: '',
        content_type: 'text',
        status: 'draft',
        duration_minutes: 0,
        canva_url: '',
        conference_url: ''
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

  // Edit and Delete functions for courses
  const handleEditCourse = async (course: Course) => {
    setEditingCourse(course)
    
    // Load current course color if exists
    const { data: courseColor } = await supabase
      .from('course_colors')
      .select('*')
      .eq('course_id', course.id)
      .single()
    
    setNewCourse({
      title: course.title,
      description: course.description,
      course_group: course.course_group || course.description, // Use course_group if available, fallback to description
      course_type: course.course_type || 'academic',
      status: course.status,
      enrollment_type: course.enrollment_type,
      color_name: courseColor?.color_name || '',
      color_hex: courseColor?.color_hex || '',
      bg_class: courseColor?.bg_class || '',
      text_class: courseColor?.text_class || '',
      border_class: courseColor?.border_class || ''
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
          description: newCourse.course_group, // Store course group in description field for now
          course_group: newCourse.course_group,
          course_type: newCourse.course_type,
          status: newCourse.status,
          enrollment_type: newCourse.enrollment_type
        })
        .eq('id', editingCourse.id)

      if (error) {
        console.error('Error updating course:', error)
        showError('Error', 'Error updating course: ' + error.message)
        return
      }

      // Handle color updates
      const { data: existingColor } = await supabase
        .from('course_colors')
        .select('*')
        .eq('course_id', editingCourse.id)
        .single()

      if (newCourse.color_name) {
        // User selected a color
        if (existingColor) {
          // Update existing color assignment
          const { error: colorUpdateError } = await supabase
            .from('course_colors')
            .update({
              color_name: newCourse.color_name,
              color_hex: newCourse.color_hex,
              bg_class: newCourse.bg_class,
              text_class: newCourse.text_class,
              border_class: newCourse.border_class
            })
            .eq('course_id', editingCourse.id)

          if (colorUpdateError) {
            console.error('Error updating course color:', colorUpdateError)
          }

          // If color changed, mark old color as available and new color as used
          if (existingColor.color_name !== newCourse.color_name) {
            // Mark old color as available
            await supabase
              .from('available_colors')
              .update({ is_used: false })
              .eq('color_name', existingColor.color_name)

            // Mark new color as used
            await supabase
              .from('available_colors')
              .update({ is_used: true })
              .eq('color_name', newCourse.color_name)
          }
        } else {
          // Create new color assignment
          const { error: colorInsertError } = await supabase
            .from('course_colors')
            .insert([{
              course_id: editingCourse.id,
              color_name: newCourse.color_name,
              color_hex: newCourse.color_hex,
              bg_class: newCourse.bg_class,
              text_class: newCourse.text_class,
              border_class: newCourse.border_class
            }])

          if (colorInsertError) {
            console.error('Error assigning course color:', colorInsertError)
          } else {
            // Mark color as used
            await supabase
              .from('available_colors')
              .update({ is_used: true })
              .eq('color_name', newCourse.color_name)
          }
        }
      } else {
        // User removed color selection
        if (existingColor) {
          // Delete color assignment
          const { error: colorDeleteError } = await supabase
            .from('course_colors')
            .delete()
            .eq('course_id', editingCourse.id)

          if (colorDeleteError) {
            console.error('Error removing course color:', colorDeleteError)
          } else {
            // Mark color as available
            await supabase
              .from('available_colors')
              .update({ is_used: false })
              .eq('color_name', existingColor.color_name)
          }
        }
      }

      setNewCourse({
        title: '',
        description: '',
        course_group: '',
        course_type: 'academic',
        status: 'draft',
        enrollment_type: 'trainee',
        color_name: '',
        color_hex: '',
        bg_class: '',
        text_class: '',
        border_class: ''
      })
      setEditingCourse(null)
      setShowEditCourseModal(false)
      await fetchCourses()
      await fetchAvailableColors() // Refresh available colors
      
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
            enrollment_type: newCourse.enrollment_type,
            color_changed: !!newCourse.color_name
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
      peer_lead_id: subject.peer_lead_id || '',
      order_index: subject.order_index,
      status: subject.status,
      enrollment_type: subject.enrollment_type
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
          description: newSubject.description,
          peer_lead_id: newSubject.peer_lead_id || null,
          status: newSubject.status,
          enrollment_type: newSubject.enrollment_type,
          order_index: newSubject.order_index
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
        peer_lead_id: '',
        order_index: 1,
        status: 'draft',
        enrollment_type: 'trainee'
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
          participant_id: traineeId,
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
            const subjectIds = courseSubjects.map(s => s.id)
            
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
          
          // Delete course colors
          await supabase
            .from('course_colors')
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

  // Helper function to start lesson/presentation
  const handleStartLesson = (module: CourseModule) => {
    setCurrentPresentationModule(module)
    setShowPresentationModal(true)
  }

  // Color selection handler
  const handleColorSelect = (color: {color_name: string, color_hex: string, bg_class: string, text_class: string, border_class: string}) => {
    setNewCourse(prev => ({
      ...prev,
      color_name: color.color_name,
      color_hex: color.color_hex,
      bg_class: color.bg_class,
      text_class: color.text_class,
      border_class: color.border_class
    }))
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
        return (
          <div className="w-full h-full p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg p-8">
                <h1 className="text-3xl font-bold text-black mb-6">{module.title}</h1>
                <div className="flex items-center mb-6 p-4 bg-gray-100 rounded-lg">
                  <svg className="w-8 h-8 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Document Resource</h3>
                    <p className="text-gray-600">{module.description}</p>
                  </div>
                </div>
                <p className="text-gray-600">Document viewer and download functionality coming soon!</p>
              </div>
            </div>
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

  // Helper function to get course color
  const getCourseColor = (courseId: string) => {
    const courseColor = courseColors.find(color => color.course_id === courseId)
    return courseColor || null
  }

  // Render functions
  const renderBreadcrumb = () => (
    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
      {selectedCourse && (
        <>
          <button 
            onClick={handleBackToCourses}
            className="hover:text-gray-700"
          >
            Courses
          </button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <button 
            onClick={handleBackToSubjects}
            className={`hover:text-gray-700 ${currentView === 'subjects' ? 'text-black font-medium' : ''}`}
          >
            {selectedCourse.title}
          </button>
        </>
      )}
      {selectedSubject && (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-black font-medium">{selectedSubject.title}</span>
        </>
      )}
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
    <div className="p-8">

      {renderBreadcrumb()}

      {/* Courses View */}
      {currentView === 'courses' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-visible relative min-h-[120px]">
            <div className="flex items-center justify-between">
              <div className="z-10 pr-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Course Management
                </h2>
                <p className="text-gray-600">
                  Create and manage courses for your learning management system
                </p>
              </div>
              
              {/* Book Illustration - Overlapping */}
              <div className="hidden md:block absolute -top-16 w-48 h-48 z-0" style={{ right: '5px' }}>
                <img 
                  src="/book.png" 
                  alt="Book illustration" 
                  className="w-full h-full object-contain opacity-90"
                />
              </div>
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Courses */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Courses */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active</p>
                  <p className="text-2xl font-bold text-green-600">{courses.filter(c => c.status === 'active').length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Inactive Courses */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Inactive</p>
                  <p className="text-2xl font-bold text-red-600">{courses.filter(c => c.status === 'inactive').length}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Draft Courses */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Draft</p>
                  <p className="text-2xl font-bold text-yellow-600">{courses.filter(c => c.status === 'draft').length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black">Courses</h2>
                <div className="flex items-center gap-3">
                  {/* View Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                        viewMode === 'list'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                        viewMode === 'card'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                  </div>
                  {courses.length > 0 && (
                    <button 
                      onClick={() => setShowAddCourseModal(true)}
                      className="px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2"
                      style={{ backgroundColor: getButtonBg() }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Course</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

          <div className="p-6">
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-black mb-2">No courses yet</h3>
                <p className="text-gray-500 mb-4">Get started by creating your first course</p>
                <button 
                  onClick={() => setShowAddCourseModal(true)}
                  className="px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                >
                  Create Course
                </button>
              </div>
            ) : viewMode === 'list' ? (
              /* List View */
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-gray-400 mr-3 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{course.title}</div>
                              <div className="text-sm text-gray-500 line-clamp-1">{course.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {course.course_type === 'academic' ? 'Academic' : course.course_type === 'tesda' ? 'TESDA' : 'UpSkill'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {getEnrollmentTypeDisplay(course.enrollment_type).map((badge, idx) => (
                              <span key={idx} className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${badge.color}`}>
                                {badge.text}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(course.status)}`}>
                            {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEnrolltrainees(course)}
                              className="px-3 py-1.5 text-white rounded-lg text-xs transition-colors"
                              style={{ backgroundColor: getButtonBg() }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                            >
                              Enroll
                            </button>
                            <button
                              onClick={() => handleCourseSelect(course)}
                              className="px-3 py-1.5 text-white rounded-lg text-xs transition-colors"
                              style={{ backgroundColor: getButtonBg() }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                            >
                              Subjects
                            </button>
                            <button
                              onClick={() => handleEditCourse(course)}
                              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const courseColor = getCourseColor(course.id)
                  return (
                    <div 
                      key={course.id} 
                      className="group relative bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full"
                    >
                      {/* Color Header Bar */}
                      <div className="h-2 w-full bg-white flex-shrink-0" />
                      
                      <div className="p-6 flex flex-col flex-1">
                        {/* Header with Color Indicator */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-3 flex-1">
                            {/* Color Circle */}
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white shadow-sm" />
                            </div>
                            
                            {/* Course Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-black transition-colors">
                                {course.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-3 leading-relaxed">
                                {course.description}
                              </p>
                              {/* All Badges in One Row */}
                              <div className="flex items-center flex-wrap gap-2 mb-2">
                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(course.status)}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    course.status === 'active' ? 'bg-green-600' :
                                    course.status === 'inactive' ? 'bg-red-600' :
                                    'bg-yellow-600'
                                  }`} />
                                  {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {course.course_type === 'academic' ? 'Academic' : course.course_type === 'tesda' ? 'TESDA' : 'UpSkill'}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getEnrollmentTypeDisplay(course.enrollment_type)[0].color}`}>
                                  {getEnrollmentTypeDisplay(course.enrollment_type)[0].text}
                                </span>
                                {getEnrollmentTypeDisplay(course.enrollment_type).length > 1 && (
                                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getEnrollmentTypeDisplay(course.enrollment_type)[1].color}`}>
                                    {getEnrollmentTypeDisplay(course.enrollment_type)[1].text}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                            <button
                              onClick={() => handleEditCourse(course)}
                              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit course"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course)}
                              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                              title="Delete course"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Action Button - Always at bottom */}
                        <div className="mt-auto space-y-2">
                          <button 
                            onClick={() => handleEnrolltrainees(course)}
                            className="w-full px-4 py-2.5 text-white rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                            style={{ backgroundColor: getButtonBg() }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            <span>Enroll Students</span>
                          </button>
                          <button 
                            onClick={() => handleCourseSelect(course)}
                            className="w-full px-4 py-3 text-white rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
                            style={{ backgroundColor: getButtonBg() }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                          >
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              <span>Manage Subjects</span>
                            </div>
                          </button>
                        </div>
                      </div>
                      
                      {/* Hover Overlay Effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Subjects View */}
      {currentView === 'subjects' && selectedCourse && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-visible relative min-h-[120px]">
            <div className="flex items-center justify-between">
              <div className="z-10 pr-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Subject Management
                </h2>
                <p className="text-gray-600">
                  Organize subjects and assign trainees for <span className="font-semibold text-gray-900">{selectedCourse.title}</span>
                </p>
              </div>
              
              {/* Book Illustration - Overlapping */}
              <div className="hidden md:block absolute -top-16 w-48 h-48 z-0" style={{ right: '5px' }}>
                <img 
                  src="/book.png" 
                  alt="Book illustration" 
                  className="w-full h-full object-contain opacity-90"
                />
              </div>

              {/* Add Subject Button */}
              <button 
                onClick={() => setShowAddSubjectModal(true)}
                className="z-10 px-6 py-3 text-white rounded-lg transition-colors flex items-center space-x-2"
                style={{ backgroundColor: getButtonBg() }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Subject</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-6">
            {subjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No subjects yet</h3>
                <p className="text-gray-600 mb-4">Start building your course by adding subjects to organize your content</p>
                <button 
                  onClick={() => setShowAddSubjectModal(true)}
                  className="px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                >
                  Add Subject
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {subjects.map((subject, index) => (
                  <div
                    key={subject.id}
                    className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Order Number */}
                        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl font-bold text-gray-700">{subject.order_index}</span>
                        </div>
                        
                        {/* Subject Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 truncate">
                              {subject.title}
                            </h3>
                            <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                              subject.status === 'active' ? 'bg-green-100 text-green-700' :
                              subject.status === 'inactive' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {subject.status.charAt(0).toUpperCase() + subject.status.slice(1)}
                            </span>
                          </div>
                          
                          {subject.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-1">
                              {subject.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            {/* Instructor */}
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-gray-500">Instructor:</span>
                              <span className={`font-semibold ${
                                subject.trainee_name === 'Unassigned' ? 'text-gray-400 italic' : 'text-gray-900'
                              }`}>
                                {subject.trainee_name}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <button 
                            onClick={() => handleSubjectSelect(subject)}
                            className="px-4 py-2 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                            style={{ backgroundColor: getButtonBg() }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span>Modules</span>
                          </button>
                          <button
                            onClick={() => handleEditSubject(subject)}
                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                            title="Edit subject"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(subject)}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                            title="Delete subject"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Modules View */}
      {currentView === 'modules' && selectedSubject && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-visible relative min-h-[120px]">
            <div className="flex items-center justify-between">
              <div className="z-10 pr-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Module Management
                </h2>
                <p className="text-gray-600">
                  Create and organize learning modules for <span className="font-semibold text-gray-900">{selectedSubject.title}</span>
                </p>
              </div>
              
              {/* Book Illustration - Overlapping */}
              <div className="hidden md:block absolute -top-16 w-48 h-48 z-0" style={{ right: '5px' }}>
                <img 
                  src="/book.png" 
                  alt="Book illustration" 
                  className="w-full h-full object-contain opacity-90"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-black">Modules in {selectedSubject.title}</h2>
                <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-medium rounded-full">
                  {modules.length} module{modules.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button 
                onClick={() => setShowAddModuleModal(true)}
                className="px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2"
                style={{ backgroundColor: getButtonBg() }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Module</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {modules.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-black mb-2">No modules yet</h3>
                <p className="text-gray-500 mb-4">Add modules to build your subject content</p>
                <button 
                  onClick={() => setShowAddModuleModal(true)}
                  className="px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                >
                  Add Module
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    {/* Module Header */}
                    <div className="relative bg-white p-4 sm:p-6">
                      {/* Decorative Pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
                          <defs>
                            <pattern id={`pattern-module-admin-${module.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                              <circle cx="20" cy="20" r="2" fill="black" opacity="0.5"/>
                              <circle cx="0" cy="0" r="1" fill="black" opacity="0.3"/>
                              <circle cx="40" cy="40" r="1" fill="black" opacity="0.3"/>
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill={`url(#pattern-module-admin-${module.id})`}/>
                        </svg>
                      </div>
                      
                      {/* Module Number Badge */}
                      <div className="relative flex items-center justify-between mb-3">
                        <div className="flex items-center justify-center w-12 h-12 bg-black/10 backdrop-blur-sm rounded-xl">
                          <span className="text-2xl font-bold text-black">{index + 1}</span>
                        </div>
                        {'status' in module && module.status && (
                          <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full backdrop-blur-md ${
                            module.status === 'active' ? 'bg-green-500 text-white' :
                            module.status === 'inactive' ? 'bg-red-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}>
                            {module.status.charAt(0).toUpperCase() + module.status.slice(1)}
                          </span>
                        )}
                      </div>
                      
                      {/* Module Title */}
                      <h3 className="relative text-xl font-bold text-black line-clamp-2">
                        {module.title}
                      </h3>
                    </div>
                    
                    {/* Module Content */}
                    <div className="p-4 sm:p-6 flex flex-col flex-1">
                      {/* Description */}
                      {module.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {module.description}
                        </p>
                      )}
                      
                      {/* Module Info */}
                      <div className="mt-auto space-y-3">
                        <div className="pt-4 border-t border-gray-100 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Type:</span>
                            <span className="font-semibold text-gray-900 capitalize flex items-center gap-1">
                              {getContentTypeIcon(module.content_type)}
                              {module.content_type === 'canva_presentation' ? 'Canva' : module.content_type.replace('_', ' ')}
                            </span>
                          </div>
                          {module.duration_minutes && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Duration:</span>
                              <span className="font-semibold text-gray-900">
                                {module.duration_minutes} min
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditModule(module)}
                            className="flex-1 px-3 py-2 text-white rounded-xl font-semibold text-sm transition-colors duration-200 flex items-center justify-center space-x-1"
                            title="Edit module"
                            style={{ backgroundColor: getButtonBg() }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteModule(module)}
                            className="px-3 py-2 bg-gray-600 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            title="Delete module"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Start Lesson Button */}
                        <button
                          onClick={() => handleStartLesson(module)}
                          className="w-full px-4 py-2.5 text-white rounded-xl font-semibold text-sm transition-colors duration-200 flex items-center justify-center space-x-2"
                          style={{ backgroundColor: getButtonBg() }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Start Lesson</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter course title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Course Group *</label>
                <select
                  required
                  value={newCourse.course_group}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, course_group: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                >
                  <option value="">Select a course group</option>
                  <option value="Programming">Programming</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile Development">Mobile Development</option>
                  <option value="Robotics">Robotics</option>
                  <option value="Automation & Control">Automation & Control</option>
                  <option value="Data Science & AI">Data Science & AI</option>
                  <option value="Networking & Cybersecurity">Networking & Cybersecurity</option>
                  <option value="Software Tools">Software Tools</option>
                  <option value="Game Development">Game Development</option>
                  <option value="Engineering & Technology">Engineering & Technology</option>

                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Course Type *</label>
                <select
                  required
                  value={newCourse.course_type}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, course_type: e.target.value as 'academic' | 'tesda' | 'upskill' }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black">
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
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Enrollment Type *</label>
                  <select
                    required
                    value={newCourse.enrollment_type}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, enrollment_type: e.target.value as 'trainee' | 'tesda_scholar' | 'both' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="trainee">Trainee</option>
                    <option value="tesda_scholar">TESDA Scholar</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonBg())}
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Creating...' : 'Create Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter subject title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Description *</label>
                <textarea
                  required
                  value={newSubject.description}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter subject description"
                />
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
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Status *</label>
                  <select
                    required
                    value={newSubject.status}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'draft' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Assign Instructor</label>
                  <select
                    value={newSubject.trainee_id}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, peer_lead_id: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
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

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonBg())}
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Creating...' : 'Create Subject'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter subject title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Description *</label>
                <textarea
                  required
                  value={newSubject.description}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter subject description"
                />
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
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Status *</label>
                  <select
                    required
                    value={newSubject.status}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'draft' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Assign Instructor</label>
                  <select
                    value={newSubject.trainee_id}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, peer_lead_id: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
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

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditSubjectModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonBg())}
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Updating...' : 'Update Subject'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {showAddModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Add New Module</h2>
                <button 
                  onClick={() => setShowAddModuleModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddModule} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-black mb-1">Module Title *</label>
                <input
                  type="text"
                  required
                  value={newModule.title}
                  onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter module title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Description *</label>
                <textarea
                  required
                  value={newModule.description}
                  onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter module description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Content Type *</label>
                  <select
                    required
                    value={newModule.content_type}
                    onChange={(e) => setNewModule(prev => ({ ...prev, content_type: e.target.value as any }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="text">Text</option>
                    <option value="video">Video</option>
                    <option value="canva_presentation">Canva Presentation</option>
                    <option value="online_conference">Online Conference</option>
                    <option value="online_document">Online Document</option>
                    <option value="pdf_document">Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={newModule.duration_minutes || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Canva URL field - only show when content type is canva_presentation */}
              {newModule.content_type === 'canva_presentation' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Canva Presentation URL *
                    <span className="text-xs text-gray-500 block mt-1">
                      Paste your Canva presentation share link or embed URL
                    </span>
                  </label>
                  <input
                    type="url"
                    required={newModule.content_type === 'canva_presentation'}
                    value={newModule.canva_url || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, canva_url: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="https://www.canva.com/design/..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tip: Make sure your Canva presentation is set to "Anyone with the link can view"
                  </div>
                </div>
              )}

              {/* Conference URL field - only show when content type is online_conference */}
              {newModule.content_type === 'online_conference' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Google Meet Link
                    <span className="text-xs text-gray-500 block mt-1">
                      Paste your Google Meet conference link
                    </span>
                  </label>
                  <input
                    type="url"
                    value={newModule.conference_url || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, conference_url: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="https://meet.google.com/..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tip: You can add the conference link now or update it later
                  </div>
                </div>
              )}

              {/* Text Content field - only show when content type is text */}
              {newModule.content_type === 'text' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Text Content *
                    <span className="text-xs text-gray-500 block mt-1">
                      Enter the lesson content or instructions
                    </span>
                  </label>
                  <textarea
                    required={newModule.content_type === 'text'}
                    value={newModule.text_content || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, text_content: e.target.value }))}
                    rows={6}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="Enter your lesson content here..."
                  />
                </div>
              )}

              {/* Video URL field - only show when content type is video */}
              {newModule.content_type === 'video' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Video URL *
                    <span className="text-xs text-gray-500 block mt-1">
                      Paste your YouTube, Vimeo, or other video link
                    </span>
                  </label>
                  <input
                    type="url"
                    required={newModule.content_type === 'video'}
                    value={newModule.video_url || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, video_url: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tip: Supports YouTube, Vimeo, and direct video URLs
                  </div>
                </div>
              )}

              {/* Document URL field - only show when content type is document */}
              {newModule.content_type === 'online_document' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Document URL *
                    <span className="text-xs text-gray-500 block mt-1">
                      Paste your Google Docs, PDF, or document link
                    </span>
                  </label>
                  <input
                    type="url"
                    required={newModule.content_type === 'online_document'}
                    value={newModule.document_url || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, document_url: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="https://docs.google.com/document/..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tip: Make sure your document is set to "Anyone with the link can view"
                  </div>
                </div>
              )}

              {/* PDF Document Upload - only show when content type is pdf_document */}
              {newModule.content_type === 'pdf_document' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    PDF Document *
                    <span className="text-xs text-gray-500 block mt-1">
                      Upload a PDF file (max 10MB)
                    </span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    required={newModule.content_type === 'pdf_document' && !newModule.document_url}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          alert('File size must be less than 10MB')
                          e.target.value = ''
                          return
                        }
                        const uploadedUrl = await uploadPDFFile(file)
                        if (uploadedUrl) {
                          setNewModule(prev => ({ ...prev, document_url: uploadedUrl }))
                        }
                      }
                    }}
                    disabled={uploadingFile}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 disabled:opacity-50"
                  />
                  {uploadingFile && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center">
                      <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </div>
                  )}
                  {!uploadingFile && newModule.document_url && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ File uploaded successfully
                    </div>
                  )}
                </div>
              )}


              <div>
                <label className="block text-xs font-medium text-black mb-1">Status *</label>
                <select
                  required
                  value={newModule.status}
                  onChange={(e) => setNewModule(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'draft' }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModuleModal(false)}
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
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Edit Module</h2>
                <button 
                  onClick={() => setShowEditModuleModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateModule} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-black mb-1">Module Title *</label>
                <input
                  type="text"
                  required
                  value={newModule.title}
                  onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter module title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Description *</label>
                <textarea
                  required
                  value={newModule.description}
                  onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter module description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Content Type *</label>
                  <select
                    required
                    value={newModule.content_type}
                    onChange={(e) => setNewModule(prev => ({ ...prev, content_type: e.target.value as any }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="text">Text</option>
                    <option value="video">Video</option>
                    <option value="canva_presentation">Canva Presentation</option>
                    <option value="online_conference">Online Conference</option>
                    <option value="online_document">Online Document</option>
                    <option value="pdf_document">Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={newModule.duration_minutes || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Canva URL field - only show when content type is canva_presentation */}
              {newModule.content_type === 'canva_presentation' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Canva Presentation URL *
                    <span className="text-xs text-gray-500 block mt-1">
                      Paste your Canva presentation share link or embed URL
                    </span>
                  </label>
                  <input
                    type="url"
                    required={newModule.content_type === 'canva_presentation'}
                    value={newModule.canva_url || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, canva_url: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="https://www.canva.com/design/..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tip: Make sure your Canva presentation is set to "Anyone with the link can view"
                  </div>
                </div>
              )}

              {/* Conference URL field - only show when content type is online_conference */}
              {newModule.content_type === 'online_conference' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Google Meet Link
                    <span className="text-xs text-gray-500 block mt-1">
                      Paste your Google Meet conference link
                    </span>
                  </label>
                  <input
                    type="url"
                    value={newModule.conference_url || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, conference_url: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="https://meet.google.com/..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tip: You can add the conference link now or update it later
                  </div>
                </div>
              )}

              {/* Text Content field - only show when content type is text */}
              {newModule.content_type === 'text' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Text Content *
                    <span className="text-xs text-gray-500 block mt-1">
                      Enter the lesson content or instructions
                    </span>
                  </label>
                  <textarea
                    required={newModule.content_type === 'text'}
                    value={newModule.text_content || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, text_content: e.target.value }))}
                    rows={6}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="Enter your lesson content here..."
                  />
                </div>
              )}

              {/* Video URL field - only show when content type is video */}
              {newModule.content_type === 'video' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Video URL *
                    <span className="text-xs text-gray-500 block mt-1">
                      Paste your YouTube, Vimeo, or other video link
                    </span>
                  </label>
                  <input
                    type="url"
                    required={newModule.content_type === 'video'}
                    value={newModule.video_url || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, video_url: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tip: Supports YouTube, Vimeo, and direct video URLs
                  </div>
                </div>
              )}

              {/* Document URL field - only show when content type is online_document */}
              {newModule.content_type === 'online_document' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Document URL *
                    <span className="text-xs text-gray-500 block mt-1">
                      Paste your Google Docs, PDF, or document link
                    </span>
                  </label>
                  <input
                    type="url"
                    required={newModule.content_type === 'online_document'}
                    value={newModule.document_url || ''}
                    onChange={(e) => setNewModule(prev => ({ ...prev, document_url: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="https://docs.google.com/document/..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tip: Make sure your document is set to "Anyone with the link can view"
                  </div>
                </div>
              )}

              {/* PDF Document Upload - only show when content type is pdf_document */}
              {newModule.content_type === 'pdf_document' && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    PDF Document *
                    <span className="text-xs text-gray-500 block mt-1">
                      Upload a PDF file (max 10MB)
                    </span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    required={newModule.content_type === 'pdf_document' && !newModule.document_url}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          alert('File size must be less than 10MB')
                          e.target.value = ''
                          return
                        }
                        const uploadedUrl = await uploadPDFFile(file)
                        if (uploadedUrl) {
                          setNewModule(prev => ({ ...prev, document_url: uploadedUrl }))
                        }
                      }
                    }}
                    disabled={uploadingFile}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 disabled:opacity-50"
                  />
                  {uploadingFile && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center">
                      <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </div>
                  )}
                  {!uploadingFile && newModule.document_url && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ File uploaded successfully
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-black mb-1">Status *</label>
                <select
                  required
                  value={newModule.status}
                  onChange={(e) => setNewModule(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'draft' }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModuleModal(false)}
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
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter course title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Course Group *</label>
                <select
                  required
                  value={newCourse.course_group}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, course_group: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                >
                  <option value="">Select a course group</option>
                  <option value="Programming">Programming</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile Development">Mobile Development</option>
                  <option value="Robotics">Robotics</option>
                  <option value="Automation & Control">Automation & Control</option>
                  <option value="Data Science & AI">Data Science & AI</option>
                  <option value="Networking & Cybersecurity">Networking & Cybersecurity</option>
                  <option value="Software Tools">Software Tools</option>
                  <option value="Game Development">Game Development</option>
                  <option value="Engineering & Technology">Engineering & Technology</option>

                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Course Type *</label>
                <select
                  required
                  value={newCourse.course_type}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, course_type: e.target.value as 'academic' | 'tesda' | 'upskill' }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black">
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
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Enrollment Type *</label>
                  <select
                    required
                    value={newCourse.enrollment_type}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, enrollment_type: e.target.value as 'trainee' | 'tesda_scholar' | 'both' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="trainee">Trainee</option>
                    <option value="tesda_scholar">TESDA Scholar</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditCourseModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: getButtonBg() }}
                  onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonHoverBg())}
                  onMouseLeave={(e) => !submitting && (e.currentTarget.style.backgroundColor = getButtonBg())}
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Updating...' : 'Update Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
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
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Presentation Modal */}
      {showPresentationModal && currentPresentationModule && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
          <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getContentTypeIcon(currentPresentationModule.content_type)}
                  <h2 className="text-xl font-semibold text-white">{currentPresentationModule.title}</h2>
                </div>
                <span className="px-3 py-1 bg-white bg-opacity-20 text-white text-sm rounded-full">
                  {currentPresentationModule.content_type === 'canva_presentation' ? 'Canva Presentation' : currentPresentationModule.content_type}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {currentPresentationModule.duration_minutes && (
                  <span className="text-white text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    {currentPresentationModule.duration_minutes} min
                  </span>
                )}
                <button 
                  onClick={() => {
                    setShowPresentationModal(false)
                    setCurrentPresentationModule(null)
                  }}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  title="Close presentation"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
              <div className="w-full h-full bg-white rounded-lg overflow-hidden">
                {renderPresentationContent(currentPresentationModule)}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="text-white text-sm">
                  <p className="opacity-75">{currentPresentationModule.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      setShowPresentationModal(false)
                      setCurrentPresentationModule(null)
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close Lesson
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enroll trainees Modal */}
      {showEnrolltraineesModal && selectedCourseForEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-black">Available trainees</h3>
                    <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-medium rounded-full">
                      {availabletrainees.length} available
                    </span>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                    {availabletrainees.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {availabletrainees.map((trainee) => (
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















