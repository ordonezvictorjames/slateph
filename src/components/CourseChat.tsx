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
  description: string
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
}

export default function CourseChat({ isOpen, onClose }: CourseChatProps) {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | LoungeChat | null>(null)
  const [messages, setMessages] = useState<CourseChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

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
      
      // Refresh messages every second for real-time updates
      const messageRefreshInterval = setInterval(() => {
        loadMessages()
      }, 1000)

      return () => {
        clearInterval(messageRefreshInterval)
      }
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
          .select('id, title, description')
          .eq('status', 'active')
          .order('title')

        if (error) {
          console.error('Error loading courses for admin:', error)
        }
        if (!error && data) {
          coursesData = data
        }
      } else if (userRole === 'instructor' || userRole === 'developer') {
        // Instructors and developers can access courses they teach
        const { data, error } = await supabase
          .from('subjects')
          .select(`
            course_id,
            courses!inner (
              id,
              title,
              description
            )
          `)
          .eq('instructor_id', user.id)
          .eq('courses.status', 'active')

        if (error) {
          console.error('Error loading courses for instructor/developer:', error)
        }
        if (!error && data) {
          // Extract unique courses
          const uniqueCourses = new Map()
          data.forEach((item: any) => {
            if (item.courses && !uniqueCourses.has(item.courses.id)) {
              uniqueCourses.set(item.courses.id, item.courses)
            }
          })
          coursesData = Array.from(uniqueCourses.values())
        }
      } else {
        // trainees can access courses they're enrolled in
        console.log('Querying course_enrollments for trainee_id:', user.id)
        const { data, error } = await supabase
          .from('course_enrollments')
          .select(`
            course_id,
            courses!inner (
              id,
              title,
              description
            )
          `)
          .eq('trainee_id', user.id)
          .eq('courses.status', 'active')

        if (error) {
          console.error('Error loading courses for trainee:', error)
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
        }
        if (!error && data) {
          console.log('trainee enrollments found:', data)
          coursesData = data.map((item: any) => item.courses)
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
    if (!newMessage.trim() || !user || !selectedCourse || sending) return

    const isLounge = 'isLounge' in selectedCourse && selectedCourse.isLounge

    setSending(true)
    try {
      console.log('Attempting to send message:', {
        isLounge,
        course_id: isLounge ? null : selectedCourse.id,
        sender_id: user.id,
        message: newMessage.trim()
      })

      const tableName = isLounge ? 'lounge_chat_messages' : 'course_chat_messages'
      const messageData = isLounge
        ? {
            sender_id: user.id,
            message: newMessage.trim()
          }
        : {
            course_id: selectedCourse.id,
            sender_id: user.id,
            message: newMessage.trim()
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
          messageData
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
      case 'trainee':
        return 'bg-blue-100 text-blue-700'
      case 'developer':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black">
                {selectedCourse ? selectedCourse.title : 'Course Chat'}
              </h2>
              <p className="text-xs text-gray-500">Real-time messaging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Course List Sidebar */}
          <div className="w-64 border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Chats</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Lounge Chat - Always visible */}
              <button
                onClick={() => setSelectedCourse(loungeChat)}
                className={`w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedCourse?.id === 'lounge' ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">Lounge</div>
                    <div className="text-xs text-gray-500">Global chat for everyone</div>
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
                      selectedCourse?.id === course.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900 truncate">{course.title}</div>
                    <div className="text-xs text-gray-500 truncate mt-1">{course.description}</div>
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-lg">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwnMessage = msg.sender_id === user?.id
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-start space-x-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {msg.user_avatar_url && msg.user_avatar_url.length <= 2 ? (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                                  {msg.user_avatar_url}
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                                  {msg.user_first_name.charAt(0)}{msg.user_last_name.charAt(0)}
                                </div>
                              )}
                            </div>

                            {/* Message Content */}
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs font-semibold text-gray-700">
                                  {msg.user_first_name} {msg.user_last_name}
                                </span>
                                {(msg.user_role === 'admin' || msg.user_role === 'trainee' || msg.user_role === 'developer') && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRoleBadgeColor(msg.user_role)}`}>
                                    {msg.user_role}
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400">
                                  {formatTime(msg.created_at)}
                                </span>
                              </div>
                              <div
                                className={`px-3 py-2 rounded-lg ${
                                  isOwnMessage
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
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
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage(e)
                          }
                        }}
                        placeholder="Type a message..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={2}
                        maxLength={2000}
                        disabled={sending}
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        {newMessage.length}/2000 characters
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
                    >
                      {sending ? (
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

          {/* Online Users Sidebar */}
          <div className="w-64 border-l border-gray-200 flex flex-col">
            <OnlineUsers />
          </div>
        </div>
      </div>
    </div>
  )
}
