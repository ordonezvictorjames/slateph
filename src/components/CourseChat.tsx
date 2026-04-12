'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading, ButtonLoading } from '@/components/ui/loading'
import OnlineUsers from './OnlineUsers'

interface CourseChatMessage {
  id: string
  course_id: string | null
  sender_id: string
  message: string
  created_at: string
  user_first_name: string
  user_last_name: string
  user_avatar_url: string | null
  user_role: string
}

interface Course {
  id: string
  title: string
  thumbnail_url?: string | null
}

interface LoungeChat {
  id: 'lounge'
  title: string
  description: string
  isLounge: true
}

interface CourseChatProps {
  isOpen: boolean
  onClose: () => void
  onNavigateToProfile?: (userId?: string) => void
}

export default function CourseChat({ isOpen, onClose, onNavigateToProfile }: CourseChatProps) {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | LoungeChat | null>(null)
  const [messages, setMessages] = useState<CourseChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showCourseList, setShowCourseList] = useState(false)
  const [pastedImage, setPastedImage] = useState<{ file: File; preview: string } | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Handle paste event for images
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (!file) return
      const preview = URL.createObjectURL(file)
      setPastedImage({ file, preview })
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      const ext = file.type.split('/')[1] || 'png'
      const fileName = `chat-images/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const { error } = await supabase.storage.from('documents').upload(fileName, file, {
        contentType: file.type, cacheControl: '86400', upsert: false,
      })
      if (error) { console.error('Image upload error:', error); return null }
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
      return publicUrl
    } catch { return null }
    finally { setUploadingImage(false) }
  }

  const loungeChat: LoungeChat = {
    id: 'lounge',
    title: 'Lounge',
    description: 'Global chat for everyone',
    isLounge: true
  }

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load accessible courses
  useEffect(() => {
    if (isOpen && user) {
      loadAccessibleCourses()
    }
  }, [isOpen, user])

  // Load messages when course is selected
  useEffect(() => {
    if (selectedCourse) {
      loadMessages()
    }
  }, [selectedCourse])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!selectedCourse) return

    const isLounge = 'isLounge' in selectedCourse && selectedCourse.isLounge
    const tableName = isLounge ? 'lounge_chat_messages' : 'course_chat_messages'
    const channelName = isLounge ? 'lounge-chat' : `course-chat-${selectedCourse.id}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          ...(isLounge ? {} : { filter: `course_id=eq.${selectedCourse.id}` })
        },
        async (payload: any) => {
          // Fetch the new message with user info
          const query = supabase
            .from(tableName)
            .select(`
              *,
              profiles!${tableName}_sender_id_fkey (
                first_name,
                last_name,
                avatar_url,
                role
              )
            `)
            .eq('id', payload.new.id)
            .single()

          const { data, error } = await query

          if (data && !error) {
            const newMsg: CourseChatMessage = {
              id: data.id,
              course_id: isLounge ? null : data.course_id,
              sender_id: data.sender_id,
              message: data.message,
              created_at: data.created_at,
              user_first_name: (data.profiles as any).first_name,
              user_last_name: (data.profiles as any).last_name,
              user_avatar_url: (data.profiles as any).avatar_url,
              user_role: (data.profiles as any).role
            }
            setMessages(prev => [...prev, newMsg])
            setTimeout(scrollToBottom, 100)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedCourse])

  const loadAccessibleCourses = async () => {
    if (!user) return

    try {
      setLoading(true)
      const userRole = user.profile.role

      console.log('Loading courses for user:', { userId: user.id, role: userRole })

      let coursesData: Course[] = []

      if (userRole === 'admin') {
        // Admin can access all courses
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, thumbnail_url')
          .eq('status', 'active')
          .order('title')

        if (error) {
          console.error('Error loading courses for admin:', error)
        }
        if (!error && data) {
          coursesData = data
        }
      } else if (userRole === 'instructor') {
        // Get course IDs from subjects where this user is instructor
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('course_id')
          .eq('instructor_id', user.id)

        if (subjectError) {
          console.error('Error loading subjects for instructor:', subjectError.message || JSON.stringify(subjectError), subjectError)
        }

        if (!subjectError && subjectData && subjectData.length > 0) {
          const courseIds = Array.from(new Set(subjectData.map((s: any) => s.course_id).filter(Boolean)))
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('id, title, thumbnail_url')
            .in('id', courseIds)
            .eq('status', 'active')
            .order('title')

          if (courseError) {
            console.error('Error loading courses for instructor:', courseError.message, courseError.code, courseError.details)
          }
          if (!courseError && courseData) {
            coursesData = courseData
          }
        }
      } else if (userRole === 'developer') {
        // Developers see all active courses (same as admin)
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, thumbnail_url')
          .eq('status', 'active')
          .order('title')

        if (error) {
          console.error('Error loading courses for developer:', error.message || JSON.stringify(error), error)
        }
        if (!error && data) {
          coursesData = data
        }
      } else {
        // trainees can access courses they're enrolled in
        const { data: enrollData, error: enrollError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('trainee_id', user.id)

        if (enrollError) {
          console.error('Error loading enrollments for trainee:', enrollError.message, enrollError.code, enrollError.details)
        }

        if (!enrollError && enrollData && enrollData.length > 0) {
          const courseIds = Array.from(new Set(enrollData.map((e: any) => e.course_id).filter(Boolean)))
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('id, title, thumbnail_url')
            .in('id', courseIds)
            .eq('status', 'active')
            .order('title')

          if (courseError) {
            console.error('Error loading courses for trainee:', courseError.message, courseError.code, courseError.details)
          }
          if (!courseError && courseData) {
            coursesData = courseData
          }
        }
      }

      console.log('Loaded courses:', coursesData)
      setCourses(coursesData)
      
      // Auto-select Lounge by default
      if (!selectedCourse) {
        setSelectedCourse(loungeChat)
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!selectedCourse) return

    const isLounge = 'isLounge' in selectedCourse && selectedCourse.isLounge

    try {
      console.log('Loading messages for:', isLounge ? 'Lounge' : selectedCourse.id)
      
      const tableName = isLounge ? 'lounge_chat_messages' : 'course_chat_messages'
      
      let query = supabase
        .from(tableName)
        .select(`
          *,
          profiles!${tableName}_sender_id_fkey (
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)
        .order('created_at', { ascending: true })
        .limit(100)

      if (!isLounge) {
        query = query.eq('course_id', selectedCourse.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading messages:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return
      }

      console.log('Messages loaded:', data)

      if (data) {
        const formattedMessages: CourseChatMessage[] = data.map((msg: any) => ({
          id: msg.id,
          course_id: isLounge ? null : msg.course_id,
          sender_id: msg.sender_id,
          message: msg.message,
          created_at: msg.created_at,
          user_first_name: msg.profiles.first_name,
          user_last_name: msg.profiles.last_name,
          user_avatar_url: msg.profiles.avatar_url,
          user_role: msg.profiles.role
        }))
        setMessages(formattedMessages)
        setTimeout(scrollToBottom, 100)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !pastedImage) || !user || !selectedCourse || sending) return

    const isLounge = 'isLounge' in selectedCourse && selectedCourse.isLounge

    setSending(true)
    try {
      let messageText = newMessage.trim()

      // Upload image if pasted
      if (pastedImage) {
        const imageUrl = await uploadImage(pastedImage.file)
        if (imageUrl) {
          messageText = messageText ? `${messageText}\n[image:${imageUrl}]` : `[image:${imageUrl}]`
        }
        URL.revokeObjectURL(pastedImage.preview)
        setPastedImage(null)
      }

      const tableName = isLounge ? 'lounge_chat_messages' : 'course_chat_messages'
      const messageData = isLounge
        ? {
            sender_id: user.id,
            message: messageText
          }
        : {
            course_id: selectedCourse.id,
            sender_id: user.id,
            message: messageText
          }

      const { data, error } = await supabase
        .from(tableName)
        .insert([messageData])
        .select()

      if (error) {
        console.error('Error sending message:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          tableName,
          messageData,
          errorType: typeof error,
          errorKeys: Object.keys(error),
          fullError: JSON.stringify(error, null, 2)
        })
        
        // More helpful error message
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          alert(`Database table "${tableName}" does not exist. Please run the database migrations first.`)
        } else if (error.message?.includes('violates row-level security policy')) {
          alert('Permission denied. Please check your authentication and try again.')
        } else {
          alert(`Failed to send message: ${error.message || 'Unknown error'}`)
        }
        return
      }

      console.log('Message sent successfully:', data)

      // Optimistically add the sent message to local state immediately
      if (data && data[0]) {
        const sentMsg: CourseChatMessage = {
          id: data[0].id,
          course_id: isLounge ? null : selectedCourse.id as string,
          sender_id: user.id,
          message: messageText,
          created_at: data[0].created_at || new Date().toISOString(),
          user_first_name: user.profile?.first_name || '',
          user_last_name: user.profile?.last_name || '',
          user_avatar_url: (user.profile as any)?.avatar_url || null,
          user_role: user.profile?.role || '',
        }
        setMessages(prev => {
          // Avoid duplicate if realtime already added it
          if (prev.some(m => m.id === sentMsg.id)) return prev
          return [...prev, sentMsg]
        })
        setTimeout(scrollToBottom, 100)
      }

      setNewMessage('')
    } catch (error) {
      console.error('Unexpected error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700'
      case 'student':
        return 'bg-blue-100 text-blue-700'
      case 'developer':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-2 md:p-4">
      <div className="bg-white rounded-none sm:rounded-xl w-full h-full sm:h-[95vh] sm:max-w-6xl md:h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0f4c5c 0%, #1f7a8c 100%)' }}>
          <div className="flex items-center space-x-2">
            {/* Mobile: Back/Menu button */}
            <button
              onClick={() => setShowCourseList(!showCourseList)}
              className="md:hidden p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" style={{ color: '#0f4c5c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold text-white truncate">
                {selectedCourse ? selectedCourse.title : 'Course Chat'}
              </h2>

            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile Course List Overlay */}
          {showCourseList && (
            <div className="absolute inset-0 bg-white z-10 md:hidden flex flex-col">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Chats</h3>
                <button
                  onClick={() => setShowCourseList(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Lounge Chat */}
                <button
                  onClick={() => {
                    setSelectedCourse(loungeChat)
                    setShowCourseList(false)
                  }}
                  className={`w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    selectedCourse?.id === 'lounge' ? 'bg-teal-50 border-l-4 border-l-[#0f4c5c]' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-[#0f4c5c] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">Lounge</div>
                    </div>
                  </div>
                </button>

                {/* Course Chats */}
                {loading ? (
                  <div className="p-4 text-center text-gray-500">
                    <Loading size="sm" />
                  </div>
                ) : courses.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No course chats available
                  </div>
                ) : (
                  courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course)
                        setShowCourseList(false)
                      }}
                      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        selectedCourse?.id === course.id ? 'bg-teal-50 border-l-4 border-l-[#0f4c5c]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          {course.thumbnail_url
                            ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f4c5c' }}><svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                          }
                        </div>
                        <div className="font-medium text-sm text-gray-900 truncate">{course.title}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Course List Sidebar - Desktop only */}
          <div className="hidden md:flex w-64 border-r border-gray-200 flex-col">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Chats</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Lounge Chat - Always visible */}
              <button
                onClick={() => setSelectedCourse(loungeChat)}
                className={`w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedCourse?.id === 'lounge' ? 'bg-teal-50 border-l-4 border-l-[#0f4c5c]' : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-[#0f4c5c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">Lounge</div>
                  </div>
                </div>
              </button>

              {/* Course Chats */}
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  <Loading size="sm" />
                </div>
              ) : courses.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No course chats available
                </div>
              ) : (
                courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={`w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      selectedCourse?.id === course.id ? 'bg-teal-50 border-l-4 border-l-[#0f4c5c]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        {course.thumbnail_url
                          ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f4c5c' }}><svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                        }
                      </div>
                      <div className="font-medium text-sm text-gray-900 truncate">{course.title}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedCourse ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
                      <svg className="w-12 h-12 sm:w-12 sm:h-12 md:w-16 md:h-16 mb-2 sm:mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-xs sm:text-sm md:text-lg text-center">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwnMessage = msg.sender_id === user?.id
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-start space-x-1.5 sm:space-x-2 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {msg.user_avatar_url && msg.user_avatar_url.length <= 2 ? (
                                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm sm:text-base md:text-lg">
                                  {msg.user_avatar_url}
                                </div>
                              ) : (
                                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[#0f4c5c] to-[#1f7a8c] flex items-center justify-center text-white text-[10px] sm:text-xs md:text-sm font-semibold">
                                  {msg.user_first_name.charAt(0)}{msg.user_last_name.charAt(0)}
                                </div>
                              )}
                            </div>

                            {/* Message Content */}
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1 sm:space-x-2 mb-0.5 sm:mb-1 flex-wrap">
                                <button
                                  onClick={() => {
                                    if (onNavigateToProfile) {
                                      onNavigateToProfile(msg.sender_id === user?.id ? undefined : msg.sender_id)
                                      onClose() // Close chat when navigating to profile
                                    }
                                  }}
                                  className="text-[10px] sm:text-xs font-semibold text-gray-700 truncate hover:underline"
                                >
                                  {msg.user_first_name} {msg.user_last_name}
                                </button>
                                {(msg.user_role === 'admin' || msg.user_role === 'shs_student' || msg.user_role === 'jhs_student' || msg.user_role === 'college_student' || msg.user_role === 'developer') && (
                                  <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded ${getRoleBadgeColor(msg.user_role)}`}>
                                    {msg.user_role}
                                  </span>
                                )}
                                <span className="text-[9px] sm:text-[10px] text-gray-400">
                                  {formatTime(msg.created_at)}
                                </span>
                              </div>
                              <div
                                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${
                                  isOwnMessage
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                                style={isOwnMessage ? { background: '#0f4c5c' } : {}}
                              >
                                {msg.message.includes('[image:') ? (
                                  <div className="space-y-1">
                                    {msg.message.split('\n').map((part, i) => {
                                      const imgMatch = part.match(/^\[image:(.*)\]$/)
                                      if (imgMatch) {
                                        return <img key={i} src={imgMatch[1]} alt="shared" className="max-w-[200px] rounded-lg cursor-pointer" onClick={() => window.open(imgMatch[1], '_blank')} />
                                      }
                                      return part ? <p key={i} className="text-xs sm:text-sm whitespace-pre-wrap break-words">{part}</p> : null
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-2 sm:p-3 md:p-4 border-t border-gray-200">
                  {/* Pasted image preview */}
                  {pastedImage && (
                    <div className="mb-2 relative inline-block">
                      <img src={pastedImage.preview} alt="paste preview" className="max-h-24 rounded-lg border border-gray-200" />
                      <button type="button" onClick={() => { URL.revokeObjectURL(pastedImage.preview); setPastedImage(null) }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none">×</button>
                    </div>
                  )}
                  <div className="flex items-end space-x-1.5 sm:space-x-2">
                    <div className="flex-1 min-w-0">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onPaste={handlePaste}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage(e)
                          }
                        }}
                        placeholder="Type a message or paste an image..."
                        className="w-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4c5c] focus:border-transparent resize-none text-xs sm:text-sm md:text-base"
                        rows={2}
                        maxLength={2000}
                        disabled={sending || uploadingImage}
                      />
                      <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 mt-0.5 sm:mt-1">
                        {newMessage.length}/2000 {uploadingImage && '· Uploading image...'}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !pastedImage) || sending || uploadingImage}
                      className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[38px] sm:h-[42px] text-xs sm:text-sm md:text-base flex-shrink-0"
                      style={{ background: '#0f4c5c' }}
                    >
                      {sending || uploadingImage ? (
                        <ButtonLoading />
                      ) : (
                        'Send'
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-lg">Select a chat to start messaging</p>
                </div>
              </div>
            )}
          </div>

          {/* Online Users Sidebar - Hidden on mobile */}
          <div className="hidden lg:flex w-64 border-l border-gray-200 flex-col">
            <OnlineUsers onNavigateToProfile={(userId) => {
              if (onNavigateToProfile) {
                onNavigateToProfile(userId)
                onClose() // Close chat when navigating to profile
              }
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
